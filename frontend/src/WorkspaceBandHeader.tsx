type WorkspaceBandHeaderProps = {
  title: string;
  meta?: string;
  className?: string;
  panel?: boolean;
  actions?: import("react").ReactNode;
};

export default function WorkspaceBandHeader({
  title,
  meta,
  className,
  panel = false,
  actions,
}: WorkspaceBandHeaderProps) {
  const rootClassName = [
    panel ? "workspace-panel-header" : "workspace-band-header",
    "section-card-header",
    actions ? "workspace-band-header--with-actions" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={rootClassName}>
      <div className="workspace-band-header-title-group">
        <h3>{title}</h3>
        {meta ? <span className="workspace-band-header-meta">{meta}</span> : null}
      </div>
      {actions ? <div className="workspace-band-header-actions">{actions}</div> : null}
    </header>
  );
}
