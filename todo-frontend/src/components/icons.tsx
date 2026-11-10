import type { ReactNode } from 'react'

const icon = (paths: ReactNode) =>
  function Icon({ size = 18 }: { size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {paths}
      </svg>
    )
  }

export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />)
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />)
export const SearchIcon = icon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const EditIcon = icon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>)
export const TrashIcon = icon(<><path d="M3 6h18" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></>)
export const GripIcon = icon(<><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></>)
export const LogOutIcon = icon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>)
export const CalendarIcon = icon(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>)
export const CheckCircleIcon = icon(<><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></>)
export const ArrowLeftIcon = icon(<path d="M19 12H5M12 19l-7-7 7-7" />)
