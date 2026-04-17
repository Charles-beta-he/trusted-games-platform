import { describe, it, expect } from 'vitest'
import { parseWsMessage } from './platformConnUtils.js'

describe('parseWsMessage', () => {
  it('parses valid JSON', () => {
    expect(parseWsMessage('{"type":"ping"}')).toEqual({ type: 'ping' })
  })

  it('returns null for invalid JSON', () => {
    expect(parseWsMessage('not json')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseWsMessage('')).toBeNull()
  })

  it('parses nested objects', () => {
    const msg = '{"type":"signal","data":{"type":"offer","offer":"abc"}}'
    expect(parseWsMessage(msg)).toEqual({
      type: 'signal',
      data: { type: 'offer', offer: 'abc' },
    })
  })
})
