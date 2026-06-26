import { Link } from '@tanstack/react-router'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound({ children }: { children?: React.ReactNode }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
            <div className="max-w-2xl w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
                            <Search className="h-16 w-16 text-primary" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <span className="text-3xl">❌</span>
                        </div>
                    </div>
                </div>

                {/* Error Code */}
                <div>
                    <h1 className="text-8xl font-bold text-primary mb-2">404</h1>
                    <h2 className="text-3xl font-bold mb-4">Página No Encontrada</h2>
                </div>

                {/* Message */}
                <div className="bg-card border rounded-xl p-6 shadow-lg">
                    <div className="text-muted-foreground text-lg">
                        {children || (
                            <p>
                                Lo sentimos, la página que estás buscando no existe o ha sido movida.
                            </p>
                        )}
                    </div>
                </div>

                {/* Suggestions */}
                <div className="bg-muted/50 border rounded-xl p-6">
                    <h3 className="font-semibold mb-4 text-left">¿Qué puedes hacer?</h3>
                    <ul className="text-left space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Verifica que la URL esté escrita correctamente</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Regresa a la página anterior y prueba de nuevo</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>Vuelve al inicio para encontrar lo que necesitas</span>
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver Atrás
                    </Button>
                    <Link to="/">
                        <Button size="lg">
                            <Home className="h-4 w-4 mr-2" />
                            Ir al Inicio
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}