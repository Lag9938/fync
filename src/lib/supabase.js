import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cihcnomrisrsrpdqtwrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaGNub21yaXNyc3JwZHF0d3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MjU0ODIsImV4cCI6MjA5MTUwMTQ4Mn0.XnmDckBBLir4E9W0pVLR6Ilyhot5_24wFNnOnBBf6f8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
