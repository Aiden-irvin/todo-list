import Modal from './Modal'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn danger-solid" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
