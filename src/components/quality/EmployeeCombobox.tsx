import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface EmpRow { id: string; name: string; department?: string | null; position?: string | null; status?: string | null }

let _cache: EmpRow[] | null = null;
let _cachePromise: Promise<EmpRow[]> | null = null;

const loadEmployees = async (): Promise<EmpRow[]> => {
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = (async () => {
    const { data, error } = await (supabase as any)
      .from('employees')
      .select('id,name,department,position,status')
      .order('name', { ascending: true });
    if (error) {
      _cachePromise = null;
      throw error;
    }
    const rows = (data || []).filter((e: any) => e?.name);
    _cache = rows;
    return rows;
  })();
  return _cachePromise;
};

interface Props {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

const EmployeeCombobox = ({ value, onChange, disabled, placeholder = "Select employee...", id }: Props) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<EmpRow[]>(_cache || []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    let mounted = true;
    loadEmployees()
      .then((rows) => { if (mounted) { setEmployees(rows); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const sorted = useMemo(() => employees, [employees]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        >
          {value || placeholder}
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search employee..." />
          <CommandList>
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.name} ${emp.department || ''} ${emp.position || ''}`}
                  onSelect={() => {
                    onChange(emp.name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === emp.name ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{emp.name}</span>
                    {(emp.department || emp.position) && (
                      <span className="text-xs text-muted-foreground">
                        {[emp.department, emp.position].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default EmployeeCombobox;