// Inline icons: the shadcn/ui registry is unreachable from this environment,
// so there is no icon package. These are the handful the player needs.
type IconProps = { className?: string };

const base = "h-6 w-6";

function Svg({
  className,
  children,
  filled = false,
}: IconProps & { children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className ?? base}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const PlayIcon = ({ className }: IconProps) => (
  <Svg className={className} filled>
    <path d="M8 5.5v13l11-6.5z" />
  </Svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <Svg className={className} filled>
    <rect x="7" y="5" width="3.5" height="14" rx="1" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
  </Svg>
);

export const SkipBackIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M11 5 6.5 9.5 11 14" />
    <path d="M6.5 9.5H14a5 5 0 0 1 0 10h-3" />
  </Svg>
);

export const SkipForwardIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m13 5 4.5 4.5L13 14" />
    <path d="M17.5 9.5H10a5 5 0 0 0 0 10h3" />
  </Svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ListIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Svg>
);

export const MoonIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Svg>
);

export const HomeIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" />
  </Svg>
);

export const SearchIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const LibraryIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M5 4h4v16H5zM11 4h4v16h-4zM17.5 5.5l2.5 15" />
  </Svg>
);

export const SettingsIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
  </Svg>
);

export const BookmarkIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
  </Svg>
);

export const TrashIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </Svg>
);

export const DownloadIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" />
  </Svg>
);
