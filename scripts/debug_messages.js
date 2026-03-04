const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching messages from direct_messages...");
    const { data: dm, error: err1 } = await supabase.from('direct_messages').select('*').order('created_at', { ascending: false }).limit(20);
    if (err1) {
        console.error("DM Error:", err1);
    } else {
        console.log("Last direct messages:");
        dm.forEach(m => console.log(`Sender: ${m.sender_id}, Receiver: ${m.receiver_id}, Content: ${m.content}`));
    }

    console.log("\nFetching messages from group_messages...");
    const { data: gm, error: err2 } = await supabase.from('group_messages').select('*').order('created_at', { ascending: false }).limit(20);
    if (err2) {
        console.error("GM Error:", err2);
    } else {
        console.log("Last group messages:");
        gm.forEach(m => console.log(`Group: ${m.group_id}, Sender: ${m.sender_id}, Content: ${m.content}`));
    }
    process.exit(0);
}

run();
