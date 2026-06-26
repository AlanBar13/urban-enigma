import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, Link } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"
import { useState } from "react"
import { loginFn } from "@/lib/user"
import { getTenantByIdFn } from "@/lib/tenants"
import { logger } from "@/utils/logger"
import { Home, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react"

export default function Login() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const login = useServerFn(loginFn)
    const getTenant = useServerFn(getTenantByIdFn)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!email || !password) {
            setError('Por favor completa todos los campos')
            return
        }

        try {
            setIsLoading(true)
            const { tenantId, role, error: loginError } = await login({ data: { email, password } })

            if (loginError) {
                logger('error', 'Error logging in:', { error: loginError })
                setError('Correo o contraseña incorrectos')
                return
            }

            if (role === 'superadmin') {
                router.navigate({ to: '/admin' })
                return
            }

            if (!tenantId) {
                logger('error', 'No tenant assigned to user')
                setError('No tienes un fraccionamiento asignado')
                return
            }

            const tenant = await getTenant({ data: { id: tenantId } })
            if (!tenant) {
                logger('error', 'Tenant not found for user:', { tenantId })
                setError('No se encontró tu fraccionamiento')
                return
            }
            router.navigate({ to: `/${tenant.path}` })
        } catch (error) {
            logger('error', 'Login error:', { error })
            setError('Ocurrió un error al iniciar sesión')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo & Brand */}
            <div className="text-center mb-8">
                <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                        <Home className="h-7 w-7 text-primary-foreground" />
                    </div>
                </Link>
                <h1 className="text-3xl font-bold mb-2">Bienvenido a Fraccio</h1>
                <p className="text-muted-foreground">
                    Gestiona tu fraccionamiento de manera eficiente
                </p>
            </div>

            <Card className="bg-white/80 backdrop-blur-[12px]">
                <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
                    <CardDescription>
                        Ingresa tus credenciales para acceder a tu cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Email Field */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@ejemplo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 h-11"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Contraseña</Label>
                                <a
                                    href="#"
                                    className="text-sm text-primary hover:underline"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        // TODO: Implement forgot password
                                    }}
                                >
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-11"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-11 text-base"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                <>
                                    Iniciar Sesión
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-card px-2 text-muted-foreground">
                                ¿No tienes cuenta?
                            </span>
                        </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                        Necesitas una invitación para crear una cuenta.{' '}
                        <Link to="/" className="text-primary hover:underline font-medium">
                            Solicitar acceso
                        </Link>
                    </p>
                </CardFooter>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Fraccio. Todos los derechos reservados.</p>
            </div>
        </div>
    )
}