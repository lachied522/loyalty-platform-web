import { fetchUserData } from '@/lib/crud';
import { createClient } from '@/utils/supabase/server';

import { headers } from 'next/headers';

export async function GET(
    req: Request,
    { params }: { params: { userID: string } }
) {
    const headersList = headers();
    const token = headersList.get('token');

    if (!token) {
        return Response.json({} , { status: 401 });
    }

    const supabase = createClient();

    // get user from token
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!(user && params.userID === user.id)) {
        return Response.json({} , { status: 401 });
    }

    const data = await fetchUserData(user.id, supabase);

    return Response.json(data);
}