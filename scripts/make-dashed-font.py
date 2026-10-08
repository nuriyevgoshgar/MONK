import sys, math, numpy as np
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib.tables._g_l_y_f import Glyph
import pathops
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

SRC, DST = sys.argv[1], sys.argv[2]
DASH, GAP = float(sys.argv[3]), float(sys.argv[4])
INSET = float(sys.argv[5])
S = 0.5  # px per unit
PAD = 20

font = TTFont(SRC)
gs = font.getGlyphSet()
glyf = font['glyf']

def flat_contours(path, step=8):
    """polylines (units) from pathops path"""
    out = []; cur = []
    for verb, pts in path.segments:
        if verb == 'moveTo':
            if cur: out.append(cur)
            cur = [pts[0]]
        elif verb == 'lineTo':
            cur.append(pts[0])
        elif verb == 'qCurveTo':
            p0 = cur[-1]; pts = list(pts)
            # expand implied on-curve points
            offs = pts[:-1]; end = pts[-1]
            segs = []
            for i, o in enumerate(offs):
                e = end if i == len(offs)-1 else ((o[0]+offs[i+1][0])/2, (o[1]+offs[i+1][1])/2)
                segs.append((o, e))
            for o, e in segs:
                for k in range(1, 9):
                    t = k/8
                    cur.append(((1-t)**2*p0[0]+2*(1-t)*t*o[0]+t*t*e[0], (1-t)**2*p0[1]+2*(1-t)*t*o[1]+t*t*e[1]))
                p0 = e
        elif verb == 'curveTo':
            p0 = cur[-1]; a, b, c = pts
            for k in range(1, 9):
                t = k/8
                cur.append(tuple((1-t)**3*p0[i]+3*(1-t)**2*t*a[i]+3*(1-t)*t*t*b[i]+t**3*c[i] for i in (0,1)))
        elif verb in ('closePath', 'endPath'):
            if cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return out

NB = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def skeleton_edges(sk):
    ys, xs = np.nonzero(sk)
    pix = set(zip(ys.tolist(), xs.tolist()))
    def nbrs(p): return [(p[0]+dy, p[1]+dx) for dy, dx in NB if (p[0]+dy, p[1]+dx) in pix]
    deg = {p: len(nbrs(p)) for p in pix}
    nodes = {p for p in pix if deg[p] != 2}
    used = set(); edges = []  # (pixels list, startIsNode, endIsNode)
    def trace(start, nxt):
        path = [start, nxt]; prev, cur = start, nxt
        while cur not in nodes:
            c = [q for q in nbrs(cur) if q != prev and q not in path[-3:]]
            if not c: break
            prev, cur = cur, c[0]; path.append(cur)
            if cur == start: break
        return path
    seen_e = set()
    for n in nodes:
        for q in nbrs(n):
            key = (n, q)
            if key in seen_e: continue
            p = trace(n, q)
            seen_e.add((p[0], p[1])); seen_e.add((p[-1], p[-2]))
            if len(p) > 1: edges.append((p, deg[p[0]] == 1, deg[p[-1]] == 1))
            used.update(p)
    rest = pix - used
    while rest:
        s = next(iter(rest))
        if not nbrs(s): rest.discard(s); continue
        q = nbrs(s)[0]
        p = trace(s, q); edges.append((p, False, False)); rest -= set(p); rest.discard(s)
    return edges

def rect(c, t, hl, ht):
    n = (-t[1], t[0])
    pts = [(c[0]+n[0]*hl+t[0]*ht, c[1]+n[1]*hl+t[1]*ht), (c[0]-n[0]*hl+t[0]*ht, c[1]-n[1]*hl+t[1]*ht),
           (c[0]-n[0]*hl-t[0]*ht, c[1]-n[1]*hl-t[1]*ht), (c[0]+n[0]*hl-t[0]*ht, c[1]+n[1]*hl-t[1]*ht)]
    return pts

def process(name):
    pen = DecomposingRecordingPen(gs)
    gs[name].draw(pen)
    if not pen.value: return None
    path = pathops.Path()
    pp = path.getPen(glyphSet=None)
    pen.replay(pp)
    path.simplify(fix_winding=True)
    bounds = path.bounds
    if bounds is None: return None
    x0, y0, x1, y1 = bounds
    W = int((x1-x0)*S) + 2*PAD; H = int((y1-y0)*S) + 2*PAD
    def to_px(p): return ((p[0]-x0)*S+PAD, (y1-p[1])*S+PAD)
    def to_u(py, px): return (px-PAD)/S + x0, y1 - (py-PAD)/S
    im = Image.new('1', (W, H), 0)
    # even-odd via xor of each contour (overlaps removed by simplify)
    for c in flat_contours(path):
        m = Image.new('1', (W, H), 0)
        ImageDraw.Draw(m).polygon([to_px(p) for p in c], fill=1)
        im = Image.fromarray(np.array(im) ^ np.array(m))
    a = np.array(im).astype(bool).copy()
    dt = ndi.distance_transform_edt(a)
    sk = skeletonize(a.astype(np.uint8).copy(), method='lee') > 0
    edges = skeleton_edges(sk)
    nc = ndi.convolve(sk.astype(np.uint8), np.ones((3,3), np.uint8), mode='constant') - 1
    junc = sk & (nc >= 3)
    jd = ndi.distance_transform_edt(~junc) if junc.any() else np.full(sk.shape, 1e9)
    RAD = INSET  # dot radius in units
    PITCH = DASH + GAP
    dots = []
    def near(c):
        for d in dots:
            if (d[0]-c[0])**2 + (d[1]-c[1])**2 < (PITCH*0.8)**2: return True
        return False
    for pxs, t0, t1 in edges:
        pts = np.array([to_u(p[0], p[1]) for p in pxs])
        if len(pts) >= 7:
            k = np.ones(5)/5
            sm = np.stack([np.convolve(np.pad(pts[:, c], 2, mode='edge'), k, mode='valid') for c in (0, 1)], axis=1)
            sm[0] = pts[0]; sm[-1] = pts[-1]; pts = sm
        seg = np.hypot(*np.diff(pts, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        L = cum[-1]
        if (t0 or t1) and L < 1.6*RAD*2 and not (t0 and t1): continue
        n = max(1, int(round(L / PITCH)))
        for k2 in range(n + 1):
            sdist = L * k2 / n
            i2 = min(max(int(np.searchsorted(cum, sdist)), 1), len(pts)-1)
            f = (sdist-cum[i2-1])/max(cum[i2]-cum[i2-1], 1e-9)
            c = tuple(pts[i2-1]*(1-f)+pts[i2]*f)
            if not near(c): dots.append(c)
        if len(pts) < 2: continue
    out = pathops.Path(); op_ = out.getPen()
    for c in dots:
        pts16 = [(c[0]+RAD*math.cos(a*math.pi/8), c[1]+RAD*math.sin(a*math.pi/8)) for a in range(16)]
        op_.moveTo(pts16[0]); [op_.lineTo(q) for q in pts16[1:]]; op_.closePath()
    if not dots: return path
    out.simplify(fix_winding=True)
    return out

for name in font.getGlyphOrder():
    print(name, flush=True)
    g = glyf[name]
    new = None
    if g.numberOfContours != 0:
        try:
            p = process(name)
        except Exception as e:
            print('fail', name, e); p = None
        if p is not None:
            tp = TTGlyphPen(None)
            p.draw(tp)
            new = tp.glyph()
    if new is None:
        tp = TTGlyphPen(None)
        pen = DecomposingRecordingPen(gs); gs[name].draw(pen); pen.replay(tp)
        new = tp.glyph()
    new.program = None if False else new.program if hasattr(new, 'program') else None
    glyf[name] = new

for name in font.getGlyphOrder():
    g = glyf[name]
    if g.numberOfContours > 0:
        from fontTools.ttLib.tables import ttProgram
        g.program = ttProgram.Program(); g.program.fromBytecode(b'')
    g.recalcBounds(glyf) if g.numberOfContours else None
for t in ('cvt ', 'fpgm', 'prep', 'gasp'):
    if t in font: del font[t]
# sync hmtx lsb
for name in font.getGlyphOrder():
    g = glyf[name]; adv, _ = font['hmtx'][name]
    font['hmtx'][name] = (adv, getattr(g, 'xMin', 0) if g.numberOfContours else 0)

fam = 'Farsan Dotted'
for n in font['name'].names:
    if n.nameID == 1: n.string = fam
    elif n.nameID == 3: n.string = '1.001;FarsanDotted-Regular'
    elif n.nameID == 4: n.string = fam + ' Regular'
    elif n.nameID == 6: n.string = 'FarsanDotted-Regular'
    elif n.nameID == 5: n.string = 'Version 1.001; modified (dotted)'
font['name'].setName('Dotted derivative of Farsan by Pooja Saxena. Licensed under the SIL Open Font License 1.1.', 10, 3, 1, 0x409)
font['name'].setName('https://openfontlicense.org', 14, 3, 1, 0x409)
font['name'].setName('SIL Open Font License, Version 1.1', 13, 3, 1, 0x409)
font['post'].formatType = 2.0 if False else font['post'].formatType
font.save(DST)
print('saved')
