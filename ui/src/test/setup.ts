import { GlobalRegistrator } from '@happy-dom/global-registrator'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

GlobalRegistrator.register()

afterEach(() => {
  document.body.innerHTML = ''
})
