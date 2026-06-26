import { useState } from "react";
import { useToast } from "@/components/notifications";
import { useServerFn } from "@tanstack/react-start";
import { inviteUserFn } from "@/lib/user";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/modals";
import { FormField, Select } from "@/components/forms";
import { Input } from "../ui/input";
import { Database } from "@/database.types";
import { logger } from "@/utils/logger";
import { DataTable } from "../shared";
import { GetTenantUsersQueryResult } from "@/lib/profiles/queries";

interface Props {
    tenantId: string
    houses: Array<Database['public']['Tables']['houses']['Row']>
    users: GetTenantUsersQueryResult
}

export default function UsersContainer({ tenantId, houses, users }: Props) {
    const { addToast } = useToast()
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [houseId, setHouseId] = useState<number>(0);
    const [owner, setOwner] = useState<boolean>(false);
    const inviteUser = useServerFn(inviteUserFn);

    const onSubmit = async () => {
        try {
            await inviteUser({
                data: {
                    email,
                    name,
                    tenantId,
                    house_id: houseId,
                    house_owner: owner
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
            setHouseId(0);
            setOwner(false);
            setOpen(false);
        }
    }

    return (
        <div>
            <Button className="mt-4" onClick={() => setOpen(true)}>Invitar usuario</Button>
            <FormModal
                open={open}
                onOpenChange={setOpen}
                title="Invitar Usuario"
                onSubmit={onSubmit}
            >
                <FormField label="Nombre del colono">
                    <Input
                        placeholder="Juan Perez"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </FormField>
                <FormField label="Email del colono">
                    <Input
                        placeholder="juan@fraccio.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </FormField>
                <FormField label="Casa del colono">
                    <Select value={houseId} onChange={(e) => setHouseId(Number(e.target.value))}>
                        {houses.map((house) => (
                            <option key={house.id} value={house.id}>{house.name}</option>
                        ))}
                    </Select>
                </FormField>
                <FormField label="Es dueño de la casa?">
                    <input
                        type="checkbox"
                        id="house_owner"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={owner}
                        onChange={(e) => setOwner(e.target.checked)}
                    />
                </FormField>
            </FormModal>
            <div className='mt-6'>
                <DataTable
                    data={users}
                    columns={[
                        { key: 'full_name', label: 'Nombre' },
                        { key: 'email', label: 'Email' },
                        {
                            key: 'house_users',
                            label: 'Casa',
                            render: (value: any[]) => {
                                if (!value || value.length === 0) return '-';
                                return value[0]?.houses?.name || '-';
                            }
                        },
                        { key: 'house_owner', label: 'Es dueño de la casa' }
                    ]}
                    striped
                    actions
                    onEdit={() => { }}
                    onDelete={() => { }}
                />
            </div>
        </div>
    )
}