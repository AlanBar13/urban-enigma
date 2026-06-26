import { createFileRoute } from "@tanstack/react-router";
import Login from "../components/Login";

export const Route = createFileRoute('/login')({
    component: LoginComp,
    head: () => ({
        meta: [
            {
                title: 'Iniciar Sesión | Fraccio'
            }
        ]
    })
})

function LoginComp() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--surface-container)] p-4">
            <Login />
        </div>
    )
}

