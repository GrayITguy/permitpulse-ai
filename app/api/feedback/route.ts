import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { permit_id, rating, note } = await request.json();

  if (!permit_id || ![-1, 1].includes(rating)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { error } = await supabase.from('feedback').insert({
    permit_id,
    rating,
    note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
