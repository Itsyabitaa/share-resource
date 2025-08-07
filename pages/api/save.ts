import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { content } = req.body
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    console.log('Attempting to insert content into Supabase...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fduzlslvxoyokjtzwpqi.supabase.co')
    
    const { data, error } = await supabase
      .from('files')
      .insert([{ content }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    if (!data) {
      return res.status(500).json({ error: 'No data returned from insert' })
    }

    res.status(200).json({ id: data.id })
  } catch (err) {
    console.error('Unexpected error:', err)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : 'Unknown error'
    })
  }
}