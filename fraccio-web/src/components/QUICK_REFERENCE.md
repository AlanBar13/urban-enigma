# Component Quick Reference

A quick lookup table for all available components organized by domain.

## 📊 Shared Components (Data Display)

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **Badge** | Label/tag display | `@/components/shared` | `variant`, `size` |
| **Avatar** | User profile pictures | `@/components/shared` | `size` (sm\|md\|lg\|xl) |
| **Skeleton** | Loading placeholder | `@/components/shared` | `className` |
| **DataTable** | Data grid with sorting | `@/components/shared` | `columns`, `data`, `onSort`, `striped`, `hoverable` |
| **List** | Flexible list | `@/components/shared` | `variant`, `spacing`, `border` |
| **ListItem** | List item | `@/components/shared` | `active`, `disabled` |

## 🎨 Layout Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **DashboardLayout** | Main app layout | `@/components/layouts` | `sidebar`, `header`, `sidebarWidth`, `mobileBreakpoint` |
| **PageHeader** | Page title section | `@/components/layouts` | `title`, `description`, `action` |
| **Section** | Content container | `@/components/layouts` | `padding`, `variant` |
| **Stack** | Flexbox container | `@/components/layouts` | `direction`, `gap`, `align`, `justify` |
| **Grid** | Grid layout | `@/components/layouts` | `cols`, `gap`, `responsive` |

## 👥 Tenant Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **TenantSelector** | Switch workspaces | `@/components/tenant` | `tenants`, `selectedTenantId`, `onSelect` |
| **TenantHeader** | Current tenant display | `@/components/tenant` | `tenantName`, `tenantLogo`, `userRole`, `onSwitch` |
| **RoleBadge** | Role indicator | `@/components/tenant` | `role`, `variant`, `size` |
| **WorkspaceCard** | Workspace selector | `@/components/tenant` | `id`, `name`, `logo`, `role`, `selected`, `onSelect` |

## 🧭 Navigation Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **Breadcrumbs** | Navigation trail | `@/components/navigation` | — |
| **BreadcrumbItem** | Trail item | `@/components/navigation` | `isCurrent` |
| **Tabs** | Tab navigation | `@/components/navigation` | `defaultValue` |
| **TabsList** | Tab buttons | `@/components/navigation` | — |
| **TabsTrigger** | Individual tab | `@/components/navigation` | `value` |
| **TabsContent** | Tab content | `@/components/navigation` | `value` |
| **Pagination** | Page controls | `@/components/navigation` | `currentPage`, `totalPages`, `onPageChange`, `siblingCount` |
| **SidebarNav** | Navigation menu | `@/components/navigation` | `items`, `onItemClick` |

## 📝 Form Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **FormField** | Field wrapper | `@/components/forms` | `label`, `error`, `required`, `hint` |
| **Textarea** | Multi-line input | `@/components/forms` | HTML textarea attributes |
| **Select** | Dropdown select | `@/components/forms` | HTML select attributes |
| **MultiStepForm** | Multi-step form | `@/components/forms` | `steps`, `currentStep`, `onStepChange`, `onSubmit` |
| **DynamicFieldArray** | Add/remove fields | `@/components/forms` | `fields`, `onAddField`, `onRemoveField`, `renderField` |
| **CheckboxGroup** | Checkbox list | `@/components/forms` | `options`, `value`, `onChange`, `direction` |
| **RadioGroup** | Radio button list | `@/components/forms` | `options`, `value`, `onChange`, `direction` |

## 🔔 Modal & Dialog Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **Dialog** | Dialog base | `@/components/modals` | — (use with DialogTrigger, DialogContent) |
| **DialogTrigger** | Open button | `@/components/modals` | — |
| **DialogContent** | Dialog content | `@/components/modals` | — |
| **DialogHeader** | Dialog header | `@/components/modals` | — |
| **DialogTitle** | Dialog title | `@/components/modals` | — |
| **DialogDescription** | Dialog description | `@/components/modals` | — |
| **DialogFooter** | Dialog footer | `@/components/modals` | — |
| **ConfirmDialog** | Confirmation | `@/components/modals` | `title`, `description`, `onConfirm`, `variant`, `isLoading` |
| **AlertDialog** | Alert modal | `@/components/modals` | `title`, `description`, `type`, `onAction` |
| **FormModal** | Form in modal | `@/components/modals` | `title`, `onSubmit`, `children` |
| **DrawerContent** | Side drawer | `@/components/modals` | — |

## 🔔 Notification Components

| Component | Purpose | Import | Key Props |
|-----------|---------|--------|-----------|
| **Alert** | Dismissable alert | `@/components/notifications` | `type`, `title`, `description`, `closable`, `onClose` |
| **Callout** | Static callout | `@/components/notifications` | `type`, `title`, `children` |
| **ToastProvider** | Toast context | `@/components/notifications` | `children` |
| **useToast** | Toast hook | `@/components/notifications` | — (use inside ToastProvider) |
| **ToastContainer** | Toast display | `@/components/notifications` | — (render in root layout) |
| **SnackBar** | Inline notification | `@/components/notifications` | `type`, `message`, `action`, `onClose` |

## 🎨 Variants & Options Quick Reference

### Badge Variants
- `default` | `secondary` | `destructive` | `outline` | `success` | `warning` | `info`

### Badge Sizes
- `sm` | `md` | `lg`

### Alert & Callout Types
- `info` | `success` | `warning` | `error`

### Stack Directions
- `row` | `col`

### Stack Gaps
- `xs` | `sm` | `md` | `lg` | `xl`

### Stack Align
- `start` | `center` | `end` | `stretch`

### Stack Justify
- `start` | `center` | `between` | `end`

### Section Padding
- `xs` | `sm` | `md` | `lg` | `xl`

### Section Variants
- `default` | `muted` | `bordered`

### Roles
- `owner` | `admin` | `member` | `viewer`

## 📦 Setup Checklist

- [ ] Install Radix UI dependencies: `pnpm add @radix-ui/react-dialog @radix-ui/react-avatar @radix-ui/react-select @radix-ui/react-tabs`
- [ ] Wrap app with `ToastProvider` in root layout
- [ ] Add `ToastContainer` to root layout
- [ ] Import components from domain folders (e.g., `@/components/shared`)
- [ ] Customize Tailwind config if needed for branding

## 🎯 Common Patterns

### Dashboard with Toast Notifications
```tsx
import { DashboardLayout } from '@/components/layouts'
import { SidebarNav } from '@/components/navigation'
import { ToastProvider, useToast } from '@/components/notifications'

function App() {
  return (
    <ToastProvider>
      <Dashboard />
      <ToastContainer />
    </ToastProvider>
  )
}

function Dashboard() {
  const { addToast } = useToast()

  return (
    <DashboardLayout sidebar={<SidebarNav items={navItems} />}>
      {/* Content */}
    </DashboardLayout>
  )
}
```

### Data Display with Actions
```tsx
import { DataTable, Badge } from '@/components/shared'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/modals'

function UsersList() {
  return (
    <>
      <DataTable
        columns={[
          { key: 'name', label: 'Name', sortable: true },
          {
            key: 'status',
            label: 'Status',
            render: (status) => <Badge variant="success">{status}</Badge>
          }
        ]}
        data={users}
      />
      <ConfirmDialog
        title="Delete User?"
        onConfirm={handleDelete}
      />
    </>
  )
}
```

### Multi-Step Form
```tsx
import { MultiStepForm, FormField } from '@/components/forms'
import { Input } from '@/components/ui/input'

function SignupFlow() {
  const [step, setStep] = useState(0)

  return (
    <MultiStepForm
      steps={[
        { id: '1', label: 'Account Info' },
        { id: '2', label: 'Personal Info' },
        { id: '3', label: 'Review' }
      ]}
      currentStep={step}
      onStepChange={setStep}
      onSubmit={handleSubmit}
    >
      {step === 0 && (
        <FormField label="Email" required>
          <Input />
        </FormField>
      )}
    </MultiStepForm>
  )
}
```

---

**For detailed documentation, see [COMPONENTS_GUIDE.md](./COMPONENTS_GUIDE.md)**
