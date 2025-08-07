import { GetServerSideProps } from 'next'
import { supabase } from '../../lib/supabaseClient'
import ReactMarkdown from 'react-markdown'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = context.params?.id as string
  const { data } = await supabase.from('files').select().eq('id', id).single()
  return { props: { content: data?.content || '' } }
}

export default function FilePage({ content }: { content: string }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>Shared File</h1>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}