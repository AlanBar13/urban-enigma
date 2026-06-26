import { useState } from "react";
import { FormField, Select } from "../forms";
import { FormModal } from "../modals";
import { useToast } from "../notifications";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useServerFn } from "@tanstack/react-start";
import { inviteUserFn } from "@/lib/user";
import { logger } from "@/utils/logger";
import { Database } from "@/database.types";

interface Props {
    tenants: Array<Database['public']['Tables']['tenants']['Row']>
}

export default function SAUserForm({ tenants }: Props) {
    const { addToast } = useToast()
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [tenantId, setTenantId] = useState<string>("");
    const inviteUser = useServerFn(inviteUserFn);

    const onSubmit = async () => {
        try {
            await inviteUser({
                data: {
                    email,
                    name,
                    tenantId,
                    is_admin: true
                }
            })
            addToast({
                type: 'success',
                description: `Invitación enviada a ${email} correctamente`,
                duration: 5000
            })
        } catch (error) {
            logger('error', 'Error inviting user:', { error })
            addToast({
                type: 'error',
                description: 'Error al invitar al usuario',
                duration: 10000
            })
        }
        finally {
            setName('');
            setEmail('');
            setOpen(false);
        }
    }

    return (
        <>
            <Button className="mt-4" onClick={() => setOpen(true)}>Invitar usuario Admin</Button>
            <FormModal
                open={open}
                onOpenChange={setOpen}
                title="Invitar Usuario Admin"
                onSubmit={onSubmit}
            >
                <FormField label="Nombre del administrador">
                    <Input
                        placeholder="Juan Perez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </FormField>
                <FormField label="Email del administrador">
                    <Input
                        placeholder="juan@fraccio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </FormField>
                <FormField label="Fraccionamiento del administrador">
                    <Select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                        {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                    </Select>
                </FormField>
            </FormModal>
        </>
    )
}