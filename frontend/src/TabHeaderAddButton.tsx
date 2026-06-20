type TabHeaderAddButtonProps = {
  label: string;
  onClick: () => void;
};

export default function TabHeaderAddButton({ label, onClick }: TabHeaderAddButtonProps) {
  return (
    <button type="button" className="proposals-tab-add-button" onClick={onClick}>
      <span className="proposals-tab-add-button-icon" aria-hidden="true">
        +
      </span>
      {label}
    </button>
  );
}
