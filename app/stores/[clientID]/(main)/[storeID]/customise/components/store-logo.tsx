"use client";
import { useState } from "react";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";

import { type CustomiseState, useCustomiseContext } from "../context/CustomiseContext";
import { type StoreIDState, useStoreIDContext } from "../../context/StoreIDContext";

import ImageUploader from "./image-uploader";

export default function StoreLogo() {
    const { storeData } = useStoreIDContext() as StoreIDState;
    const { updateStoreRecordAndUpdateState, uploadImageFromFile } = useCustomiseContext() as CustomiseState;
    const [imageURL, setImageURL] = useState<string | null>(storeData.store_logo_url);
    const [imageFile, setImageFile] = useState<File | null>(null); // any files uploading must be stored in state
    const [isEditting, setIsEditting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const onSave = async () => {
        if (!imageFile) return;

        setIsLoading(true);

        // image must be uploaded to store
        // resulting url is added to the store record in DB
        const res = await uploadImageFromFile(imageFile, 'logos');
        
        if (!res) {
            setIsLoading(false);
            return;  // TO DO
        }

        await updateStoreRecordAndUpdateState({ store_logo_url: res });

        setIsEditting(false);
        setIsLoading(false);
    }

    const onEditClick = () => {
        setImageURL(null);
        setIsEditting(true);
    }
    
    return (
        <div className='flex flex-col items-stretch justify-between gap-4 p-6'>
            <div className='flex flex-row items-end justify-between gap-2'>
                <div className='flex flex-col gap-2'>
                    <div className='w-full flex flex-row items-center'>
                        <div className='text-xl font-semibold'>Your Logo</div>
                    </div>
                    <p>Let customers know who you are. Upload your logo.</p>
                </div>

                <>
                    {isLoading? (
                    <Button
                        type='button'
                        variant='secondary'
                        disabled
                    >
                        Please wait...
                    </Button> 
                    ) : (
                    <>
                        {isEditting ? (
                        <Button
                            type='button'
                            disabled={!imageURL}
                            onClick={onSave}
                        >
                            Save
                        </Button>
                        ) : (
                        <Button
                            type='button'
                            variant='secondary'
                            className='flex items-center gap-1'
                            onClick={onEditClick}
                        >
                            <Pencil size={16} />
                            Edit
                        </Button>
                        )}
                    </>
                    )}
                </>
            </div>

            <ImageUploader
                alt='Your Store Logo'
                bucket='logos'
                value={imageURL}
                onChangeURL={(url: string) => setImageURL(url)}
                onChangeFile={(file: File) => setImageFile(file)}
            />
        </div>
    )
}