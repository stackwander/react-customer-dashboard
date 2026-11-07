import * as React from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import { DataGrid, GridActionsCellItem, GridRowModes, GridRowEditStopReasons,
  type GridColDef, type GridRowModesModel, type GridPaginationModel } from '@mui/x-data-grid';
import { CustomerService } from '../../../api/customers/CustomerService';
import { CustomerDto } from '../../../api/customers/CustomerDto';
import { CreateCustomerDto } from '../../../api/customers/CreateCustomerDto';
import { requestError } from '../../../api/http';

type CustomerRow = CustomerDto & { id: string; isNew?: boolean };
const fields = ['customerName', 'cemail', 'phone', 'address', 'city', 'postalCode', 'country'] as const;
const toRow = (customer: CustomerDto): CustomerRow => {
  if (!customer?.customerId) throw new Error('The server returned an invalid customer record.');
  return { ...customer, id: customer.customerId };
};

export default function CustomerGrid() {
  const [rows, setRows] = React.useState<CustomerRow[]>([]);
  const [rowModes, setRowModes] = React.useState<GridRowModesModel>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<CustomerRow | null>(null);
  const [revision, setRevision] = React.useState(0);
  const [pagination, setPagination] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [rowCount, setRowCount] = React.useState(0);
  const editing = Object.values(rowModes).some((row) => row.mode === GridRowModes.Edit);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    CustomerService.getCustomers(pagination.page, pagination.pageSize)
      .then((data) => {
        if (!active) return;
        setRows(data.rows.map(toRow));
        setRowCount(data.total);
        setRowModes({});
      })
      .catch((cause: unknown) => {
        if (active) setError(requestError(cause, 'Could not load customers. Please try again.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pagination.page, pagination.pageSize, revision]);

  const addCustomer = () => {
    const id = `new-${crypto.randomUUID()}`;
    const customer = new CreateCustomerDto('', '', '', '', '', '', '');
    setRows((current) => [...current, { ...customer, customerId: '', id, isNew: true }]);
    setRowModes((current) => ({ ...current, [id]: { mode: GridRowModes.Edit, fieldToFocus: 'customerName' } }));
  };

  const saveCustomer = async (row: CustomerRow) => {
    const payload = Object.fromEntries(fields.map((field) => [field, String(row[field] ?? '').trim()])) as unknown as CreateCustomerDto;
    if (fields.some((field) => !payload[field])) throw new Error('Please complete every customer field.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.cemail)) throw new Error('Please enter a valid customer email.');
    setSaving(true);
    setError(null);
    try {
      const customer = row.isNew
        ? await CustomerService.createCustomer(payload)
        : await CustomerService.updateCustomer(row.customerId, payload);
      const saved = toRow(customer);
      // Keep the temporary grid ID until the list reloads after a create.
      const updated = { ...saved, id: row.id, isNew: false };
      setRows((current) => current.map((item) => item.id === row.id ? updated : item));
      if (row.isNew) setRevision((value) => value + 1);
      return updated;
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow || saving) return;
    setSaving(true);
    setError(null);
    try {
      await CustomerService.deleteCustomer(deleteRow.customerId);
      setRows((current) => current.filter((item) => item.id !== deleteRow.id));
      setDeleteRow(null);
      if (rows.length === 1 && pagination.page > 0) {
        setPagination((current) => ({ ...current, page: current.page - 1 }));
      } else setRevision((value) => value + 1);
    } catch (cause) {
      setError(requestError(cause, 'Could not delete the customer. Please try again.'));
      setDeleteRow(null);
    } finally { setSaving(false); }
  };

  const columns: GridColDef<CustomerRow>[] = [
    { field: 'customerName', headerName: 'Name', width: 180, editable: true },
    { field: 'cemail', headerName: 'Email', width: 220, editable: true },
    { field: 'phone', headerName: 'Phone', width: 160, editable: true },
    { field: 'address', headerName: 'Address', width: 200, editable: true },
    { field: 'city', headerName: 'City', width: 130, editable: true },
    { field: 'postalCode', headerName: 'Postal Code', width: 120, editable: true },
    { field: 'country', headerName: 'Country', width: 130, editable: true },
    { field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
      getActions: ({ id, row }) => rowModes[id]?.mode === GridRowModes.Edit ? [
        <GridActionsCellItem key="save" icon={<SaveIcon />} label="Save" disabled={saving}
          onClick={() => setRowModes((current) => ({ ...current, [id]: { mode: GridRowModes.View } }))} />,
        <GridActionsCellItem key="cancel" icon={<CancelIcon />} label="Cancel" disabled={saving}
          onClick={() => {
            setRowModes((current) => ({ ...current, [id]: { mode: GridRowModes.View, ignoreModifications: true } }));
            if (row.isNew) setRows((current) => current.filter((item) => item.id !== id));
          }} />,
      ] : [
        <GridActionsCellItem key="edit" icon={<EditIcon />} label="Edit" disabled={saving || editing}
          onClick={() => setRowModes((current) => ({ ...current, [id]: { mode: GridRowModes.Edit } }))} />,
        <GridActionsCellItem key="delete" icon={<DeleteIcon />} label="Delete" disabled={saving || editing}
          onClick={() => setDeleteRow(row)} />,
      ],
    },
  ];

  return (
    <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography component="h2" variant="h6">Customers</Typography>
        <Button startIcon={<AddIcon />} variant="contained" disabled={loading || saving || editing || !!error} onClick={addCustomer}>
          Add customer
        </Button>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" disabled={editing || saving} onClick={() => setRevision((value) => value + 1)}>Retry</Button>}>{error}</Alert>}
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid<CustomerRow> rows={rows} columns={columns} loading={loading || saving} editMode="row"
          rowModesModel={rowModes} onRowModesModelChange={setRowModes}
          onRowEditStop={(params, event) => {
            if (params.reason === GridRowEditStopReasons.rowFocusOut) event.defaultMuiPrevented = true;
          }}
          processRowUpdate={saveCustomer}
          onProcessRowUpdateError={(cause: unknown) => setError(cause instanceof Error && !('isAxiosError' in cause)
            ? cause.message : requestError(cause, 'Could not save the customer. Your edits are still available.'))}
          paginationMode="server" rowCount={rowCount} paginationModel={pagination}
          onPaginationModelChange={(model) => { if (!editing && !saving) setPagination(model); }}
          pageSizeOptions={[10, 20, 50]} disableRowSelectionOnClick />
      </Box>
      <Dialog open={!!deleteRow} onClose={() => { if (!saving) setDeleteRow(null); }} aria-labelledby="delete-customer-title">
        <DialogTitle id="delete-customer-title">Delete customer?</DialogTitle>
        <DialogContent><DialogContentText>Delete {deleteRow?.customerName}? This action cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDeleteRow(null)}>Cancel</Button>
          <Button color="error" disabled={saving} onClick={confirmDelete}>{saving ? 'Deleting…' : 'Delete customer'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
