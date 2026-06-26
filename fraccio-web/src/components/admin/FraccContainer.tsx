import { FormModal } from '@/components/modals'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { FormField } from '../forms';
import { Input } from '../ui/input';
import { useServerFn } from '@tanstack/react-start';
import { createTenantFn } from '@/lib/tenants';
import { useToast } from '@/components/notifications';
import { DataTable } from '@/components/shared';
import { logger } from '@/utils/logger';

const slugify = (value: string) => {
    return value
        .trim()
        .toLocaleLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

interface Props {
    tenants: Array<any>
}

export default function FraccContainer({ tenants }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const createTenant = useServerFn(createTenantFn);
    const { addToast } = useToast()

    const onSubmit = async () => {
        try {
            await createTenant({ data: { name, subdomain } });
            addToast({
                type: 'success',
                description: 'Fraccionamiento creado existosamente',
                duration: 5000
            })
            setOpen(false);
        } catch (error) {
            logger('error', 'Error creating tenant:', { error });
            addToast({
                type: 'error',
                description: 'Error al crear el fraccionamiento',
                duration: 10000
            })
        }
    }

    return (
        <>
            <Button variant="secondary" onClick={() => setOpen(true)}>Agregar Fraccionamiento</Button>
            <FormModal
                open={open}
                onOpenChange={setOpen}
                title='Agregar Fraccionamiento'
                onSubmit={onSubmit}
            >
                <FormField label='Nombre'>
                    <Input
                        placeholder='Nombre del fraccionamiento'
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={(e) => setSubdomain(slugify(e.target.value))}
                    />
                </FormField>
                <FormField label='Subdominio'>
                    <Input
                        placeholder='Subdominio del fraccionamiento'
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                    />
                </FormField>
            </FormModal>
            <div className='mt-6'>
                <DataTable
                    data={tenants}
                    columns={[
                        { key: 'name', label: 'Nombre' },
                        { key: 'path', label: 'Subdominio' }
                    ]}
                    striped
                />
            </div>
        </>
    )
}