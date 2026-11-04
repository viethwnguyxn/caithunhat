const STORAGE_KEY = 'remembered_account'

export function getRememberedAccount() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function rememberAccount(account) {
  localStorage.setItem(STORAGE_KEY, account.trim())
}

export function forgetAccount() {
  localStorage.removeItem(STORAGE_KEY)
}
