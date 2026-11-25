import { getConfigPublica, logoDe } from '@/lib/config'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const c = await getConfigPublica()
  return <LoginForm grupo={c.nome_grupo} logo={logoDe(c)} />
}
