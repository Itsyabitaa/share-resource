import Swal from 'sweetalert2'

function isDarkMode() {
  if (typeof document === 'undefined') return false
  return document.body.classList.contains('dark')
}

function swalTheme() {
  const dark = isDarkMode()
  return {
    background: dark ? '#1a1816' : '#fffcf7',
    color: dark ? '#f5f5f4' : '#1c1917',
    confirmButtonColor: dark ? '#f5f5f4' : '#0f766e',
    cancelButtonColor: dark ? '#44403c' : '#a8a29e',
  }
}

export async function confirmAction(options: {
  title?: string
  text: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'error' | 'info'
  danger?: boolean
}): Promise<boolean> {
  const theme = swalTheme()
  const result = await Swal.fire({
    ...theme,
    icon: options.icon ?? (options.danger ? 'warning' : 'question'),
    title: options.title ?? (options.danger ? 'Are you sure?' : 'Confirm'),
    text: options.text,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Yes, continue',
    cancelButtonText: options.cancelText ?? 'Cancel',
    reverseButtons: true,
    focusCancel: !!options.danger,
    buttonsStyling: true,
    customClass: {
      popup: 'mdnest-swal',
      confirmButton: options.danger ? 'mdnest-swal-btn-danger' : 'mdnest-swal-btn-confirm',
      cancelButton: 'mdnest-swal-btn-cancel',
    },
  })
  return result.isConfirmed
}

export async function alertMessage(options: {
  title?: string
  text: string
  icon?: 'error' | 'success' | 'info' | 'warning'
  confirmText?: string
}) {
  const theme = swalTheme()
  await Swal.fire({
    ...theme,
    icon: options.icon ?? 'info',
    title: options.title ?? 'md-nest',
    text: options.text,
    confirmButtonText: options.confirmText ?? 'OK',
    customClass: {
      popup: 'mdnest-swal',
      confirmButton: 'mdnest-swal-btn-confirm',
    },
  })
}

export async function promptInput(options: {
  title: string
  text?: string
  inputValue?: string
  placeholder?: string
  confirmText?: string
}): Promise<string | null> {
  const theme = swalTheme()
  const result = await Swal.fire({
    ...theme,
    title: options.title,
    text: options.text,
    input: 'text',
    inputValue: options.inputValue ?? '',
    inputPlaceholder: options.placeholder,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Save',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    customClass: {
      popup: 'mdnest-swal',
      confirmButton: 'mdnest-swal-btn-confirm',
      cancelButton: 'mdnest-swal-btn-cancel',
      input: 'mdnest-swal-input',
    },
    inputValidator: (value) => {
      if (!value?.trim()) return 'Please enter a value'
      return null
    },
  })
  if (!result.isConfirmed) return null
  return String(result.value).trim()
}

export async function promptTextarea(options: {
  title: string
  text?: string
  inputLabel?: string
  inputValue?: string
  placeholder?: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'info'
  danger?: boolean
  requireNonEmpty?: boolean
}): Promise<string | null> {
  const theme = swalTheme()
  const result = await Swal.fire({
    ...theme,
    icon: options.icon ?? (options.danger ? 'warning' : 'question'),
    title: options.title,
    text: options.text,
    input: 'textarea',
    inputLabel: options.inputLabel,
    inputValue: options.inputValue ?? '',
    inputPlaceholder: options.placeholder,
    inputAttributes: {
      'aria-label': options.inputLabel ?? options.title,
      rows: '4',
    },
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Apply',
    cancelButtonText: options.cancelText ?? 'Cancel',
    reverseButtons: true,
    focusCancel: !!options.danger,
    buttonsStyling: true,
    customClass: {
      popup: 'mdnest-swal mdnest-swal-form',
      confirmButton: options.danger ? 'mdnest-swal-btn-danger' : 'mdnest-swal-btn-confirm',
      cancelButton: 'mdnest-swal-btn-cancel',
      input: 'mdnest-swal-textarea',
    },
    inputValidator: (value) => {
      if (options.requireNonEmpty !== false && !value?.trim()) {
        return 'Please enter a message'
      }
      return null
    },
  })
  if (!result.isConfirmed) return null
  return String(result.value ?? '').trim()
}
