import { useMemo } from "react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filteredCountries, getFlagUrl } from "@/lib/countries";

export function PhoneCountrySelect({ name = "Phone Country Code", defaultValue = "+212", className = "" }: { name?: string, defaultValue?: string, className?: string }) {
  const phoneOptions = useMemo(() => {
    return filteredCountries.map((c) => (
      <SelectItem key={c.code} value={c.dial_code} className="cursor-pointer">
        <div className="flex items-center gap-2">
          <img src={getFlagUrl(c.code)} alt={c.name} loading="lazy" className="w-4 h-3 object-cover rounded-[2px] shadow-sm" />
          <span>{c.dial_code}</span>
        </div>
      </SelectItem>
    ));
  }, []);

  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger className={`w-[110px] bg-background px-3 py-3 h-[46px] focus:ring-1 focus:ring-primary/20 shadow-none focus:outline-none ${className}`}>
        <SelectValue placeholder="+212" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectGroup>
          {phoneOptions}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
