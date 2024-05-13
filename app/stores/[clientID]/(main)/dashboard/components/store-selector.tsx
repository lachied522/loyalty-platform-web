"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { type ClientState, useClientContext } from "../../../context/ClientContext";
import { type DashboardState, useDashboardContext } from "../context/DashboardContext";

export default function StoreSelector() {
    const { clientData } = useClientContext() as ClientState;
    const { setSelectedStoreID } = useDashboardContext() as DashboardState;

    return (
        <Select
            onValueChange={(value: string) => setSelectedStoreID(value)}
            defaultValue={clientData.stores[0].id}
        >
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent>
                {clientData.stores.map((store) => (
                    <SelectItem
                        key={`select-${store.id}`}
                        value={store.id}
                        className='font-medium'
                    >
                        {store.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

}