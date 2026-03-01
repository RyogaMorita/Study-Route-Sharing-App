import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://apnngmgfumzmrgnhnubu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OwN6lKsOfWrZ1y_QPpz4Mw_R9CWzq7H';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);