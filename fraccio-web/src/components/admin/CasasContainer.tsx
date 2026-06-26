import { useState } from "react";
import { Button } from "../ui/button"
import { FormModal } from "../modals";
import { FormField } from "../forms";
import { Input } from "../ui/input";
import { DataTable } from "../shared";
import { useServerFn } from "@tanstack/react-start";
import { createHouseFn } from "@/lib/houses";
import { useToast } from "../notifications";
import { Database } from '@/database.types';
import { logger } from "@/utils/logger";

interface Props {
    houses: Array<Database['public']['Tables']['houses']['Row']>
    tenantId: string
}

export default function CasasContainer({ houses, tenantId }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const createHouse = useServerFn(createHouseFn);
    const { addToast } = useToast()

    const onSubmit = async () => {
        try {
            await createHouse({ data: {
                tenantId,
                name: name,
                address: address
            }})
            addToast({
                type: 'success',
                description: 'Casa creada existosamente',
                duration: 5000
            })
        }
        catch (error) {
            logger('error', 'Error creating house:', { error })
            addToast({
                type: 'error',
                description: 'Error al crear la casa',
                duration: 10000
            })
        }
        finally {
            setName('');
            setAddress('');
            setOpen(false);
        }
    }

    const onEdit = (house: Database['public']['Tables']['houses']['Row']) => {
        console.log('Edit house:', house);
    }

    const onDelete = (house: Database['public']['Tables']['houses']['Row']) => {
        console.log('Delete house:', house);
    }

    return (
        <div>
            <Button className="mt-4" onClick={() => setOpen(true)}>Crear Casa</Button>
            <FormModal
                open={open}
                onOpenChange={setOpen}
                title='Crear Casa'
                onSubmit={() => onSubmit()}
            >
                <FormField label="Nombre">
                    <Input
                        placeholder="Nombre de la casa"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </FormField>
                <FormField label="Dirección">
                    <Input
                        placeholder="Dirección de la casa"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </FormField>
            </FormModal>
            <div className='mt-6'>
                <DataTable
                    data={houses}
                    columns={[
                        { key: 'name', label: 'Nombre' },
                        { key: 'address', label: 'Dirección' }
                    ]}
                    striped
                    actions
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            </div>
        </div>
    )
}