import { describe, expect, it } from 'vitest'

import { normalizeTechnicalAlias, withNodeVisualDefaults } from '../nodeFactory'

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

describe('withNodeVisualDefaults', () => {
  it('applies shared primary actor sizing to queue and worker nodes', () => {
    const queueNode = withNodeVisualDefaults({
      id: 'analyze-queue',
      type: 'roundedRect',
      label: 'Analyze Queue',
      position: { x: 0, y: 0 },
      style: { icon: 'queue' },
    })

    const workerNode = withNodeVisualDefaults({
      id: 'analyze-worker',
      type: 'rectangle',
      label: 'Analyze Worker',
      position: { x: 0, y: 0 },
      style: { icon: 'worker' },
    })

    expect(queueNode.size).toEqual({ width: 240, height: 72 })
    expect(workerNode.size).toEqual({ width: 240, height: 72 })
  })

  it('applies the process and detail tiers without clobbering explicit widths', () => {
    const processNode = withNodeVisualDefaults({
      id: 'send-process',
      type: 'rectangle',
      semanticRole: 'process',
      label: 'Send Reply',
      position: { x: 0, y: 0 },
    })

    const detailNode = withNodeVisualDefaults({
      id: 'write-metadata',
      type: 'rectangle',
      label: 'Write Metadata',
      position: { x: 0, y: 0 },
      parentId: 'persistence-group',
    })

    const explicitWidthNode = withNodeVisualDefaults({
      id: 'custom-process',
      type: 'rectangle',
      semanticRole: 'process',
      label: 'Custom Process',
      position: { x: 0, y: 0 },
      size: { width: 260 },
    })

    expect(processNode.size).toEqual({ width: 200, height: 72 })
    expect(detailNode.size).toEqual({ width: 200, height: 44 })
    expect(explicitWidthNode.size).toEqual({ width: 260, height: 72 })
  })
})
