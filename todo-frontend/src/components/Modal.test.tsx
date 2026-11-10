import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConfirmDialog from './ConfirmDialog'
import Modal from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} title="Hello" onClose={vi.fn()}>body</Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a labelled dialog when open', () => {
    render(<Modal open title="Hello" onClose={vi.fn()}>body</Modal>)
    expect(screen.getByRole('dialog', { name: 'Hello' })).toHaveTextContent('body')
  })

  it('closes from the close button', async () => {
    const onClose = vi.fn()
    render(<Modal open title="Hello" onClose={onClose}>body</Modal>)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the backdrop is clicked but not when content is', async () => {
    const onClose = vi.fn()
    render(<Modal open title="Hello" onClose={onClose}><p>inside</p></Modal>)
    await userEvent.click(screen.getByText('inside'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('ConfirmDialog', () => {
  it('confirms and cancels', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="Delete task?" message="This cannot be undone." confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
