import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Smoke test', () => {
  it('performs basic math', () => {
    expect(1 + 1).toBe(2)
  })
})
