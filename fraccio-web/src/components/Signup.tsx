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
import { useEffect, useState } from "react"
import { useServerFn } from "@tanstack/react-start"
import { signupFn } from "@/lib/user"
import { useRouter, Link } from "@tanstack/react-router"
import { GetInviteQueryResult } from "@/lib/invites/queries"
import { useToast } from "./notifications"
import { removeInviteFn } from "@/lib/invites/functions"
import { logger } from "@/utils/logger"
import { Home, User, Mail, Lock, CheckCircle2, AlertCircle, Loader2, Building } from "lucide-react"
import { Badge } from "./ui/badge"

interface Props {
    invite: GetInviteQueryResult
}

export default function Signup({ invite }: Props) {
    const { addToast } = useToast()
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const signupWithTenant = useServerFn(signupFn)
    const removeInvite = useServerFn(removeInviteFn)

    useEffect(() => {
        setEmail(invite.email)
        setName(invite.name)
    }, [invite])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!name || !password || !confirmPassword) {
            setError('Por favor completa todos los campos')
            return
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        try {
            setLoading(true)
            const { error: signupError } = await signupWithTenant({
                data: {
                    email,
                    password,
                    name,
                    tenantId: invite.tenant_id,
                    inviteId: invite.id,
                    houseId: invite.house_id ?? undefined,
                    houseOwner: invite.house_owner ?? false,
                    is_admin: invite.is_admin ?? false
                }
            })

            if (signupError) {
                logger('error', 'Error during signup:', { error: signupError })
                setError('Error al crear la cuenta. Inténtalo nuevamente.')
                return
            }

            await removeInvite({ data: { token: invite.id } })

            addToast({
                type: 'success',
                description: '¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.',
                duration: 5000
            })

            router.navigate({ to: '/login' })
        } catch (error) {
            logger('error', 'Signup error:', { error })
            setError('Ocurrió un error inesperado. Por favor intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    const getRoleBadgeString = (): string => {
        if (invite.is_admin) {
            return 'Administrador'
        }
        return invite.house_owner ? 'Propietario' : 'Residente'
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
                <h1 className="text-3xl font-bold mb-2">Crear tu Cuenta</h1>
                <p className="text-muted-foreground">
                    Has sido invitado a unirte a Fraccio
                </p>
            </div>

            {/* Invitation Info */}
            <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Building className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-1">Invitación recibida</p>
                        <p className="text-sm text-muted-foreground mb-2">
                            Estás siendo invitado como{' '}
                            <Badge variant={invite.house_owner ? "default" : "secondary"} className="ml-1">
                                {getRoleBadgeString()}
                            </Badge>
                        </p>
                    </div>
                </div>
            </div>

            <Card className="border-2">
                <CardHeader className="space-y-1 pb-6">
                    <CardTitle className="text-2xl font-bold">Completa tu Registro</CardTitle>
                    <CardDescription>
                        Crea tu contraseña para acceder a tu cuenta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-10 h-11"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Field (Disabled) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    className="pl-10 h-11 bg-muted"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Este correo fue proporcionado en tu invitación
                            </p>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Mínimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-11"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-10 h-11"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full h-11 text-base"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creando cuenta...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Crear Cuenta
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <p className="text-center text-sm text-muted-foreground w-full">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            Iniciar sesión
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
