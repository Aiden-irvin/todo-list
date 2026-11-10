import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon } from './icons'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

// Native <dialog> provides the focus trap, Esc handling and inert background.
export default function Modal({ open, title, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="modal-body">
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
