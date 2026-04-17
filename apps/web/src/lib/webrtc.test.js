import { describe, it, expect } from 'vitest'
import { encodeOffer, decodeOffer, encodeAnswer, decodeAnswer } from './webrtc.js'

describe('encodeOffer / decodeOffer', () => {
  it('round-trips offer data', () => {
    const data = { sdp: 'v=0\r\no=- 123...', type: 'offer' }
    const encoded = encodeOffer(data)
    expect(typeof encoded).toBe('string')
    expect(decodeOffer(encoded)).toEqual(data)
  })

  it('returns null for invalid base64', () => {
    expect(decodeOffer('not-valid-base64!!!')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeOffer('')).toBeNull()
  })

  it('handles complex nested data', () => {
    const data = { sdp: { type: 'offer', sdp: 'v=0...' }, ice: [{ candidate: 'x' }] }
    expect(decodeOffer(encodeOffer(data))).toEqual(data)
  })
})

describe('encodeAnswer / decodeAnswer', () => {
  it('round-trips answer data', () => {
    const data = { sdp: 'v=0\r\no=- 456...', type: 'answer' }
    const encoded = encodeAnswer(data)
    expect(decodeAnswer(encoded)).toEqual(data)
  })

  it('returns null for invalid input', () => {
    expect(decodeAnswer('garbage')).toBeNull()
  })
})
