import { describe, expect, it } from 'vitest'

import { normalizeTechnicalAlias } from '../nodeFactory'

describe('normalizeTechnicalAlias', () => {
  it('strips queue prefixes and normalizes underscores', () => {
    expect(normalizeTechnicalAlias('rrq:queue:mail-analyze')).toBe('mail-analyze')
    expect(normalizeTechnicalAlias('mail_reply_drafts')).toBe('mail-reply-drafts')
  })

  it('strips handler prefixes and normalizes underscores', () => {
    expect(normalizeTechnicalAlias('handle_mail_send_reply')).toBe('mail-send-reply')
  })

  it('returns undefined for empty values', () => {
    expect(normalizeTechnicalAlias(undefined)).toBeUndefined()
    expect(normalizeTechnicalAlias('   ')).toBeUndefined()
  })
})
