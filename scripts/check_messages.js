const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking direct_messages table...");
    const { data: directMsgs, error: dmErr } = await supabase
        .from('direct_messages')
        .select('*');
    if (dmErr) {
        console.error("Error reading direct_messages:", dmErr);
    } else {
        console.log(`Found ${directMsgs.length} messages in direct_messages`);
        directMsgs.forEach(msg => {
            if (msg.content.toLowerCase().includes('team')) {
                console.log("Team message found in direct_messages:", msg);
            }
        });
    }

    console.log("\nChecking group_messages table...");
    const { data: groupMsgs, error: gmErr } = await supabase
        .from('group_messages')
        .select('*');
    if (gmErr) {
        console.error("Error reading group_messages:", gmErr);
    } else {
        console.log(`Found ${groupMsgs.length} messages in group_messages`);
    }
}

checkData();
