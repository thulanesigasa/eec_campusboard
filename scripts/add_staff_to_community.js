const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("Fetching staff profiles...");
    const { data: staff, error: staffError } = await supabase
        .from('profiles')
        .select('id, role, school_id')
        .in('role', ['Teacher', 'Principal', 'Vice Principal']);

    if (staffError) {
        console.error("Error fetching staff:", staffError);
        return;
    }

    if (!staff || staff.length === 0) {
        console.log("No staff found to migrate.");
        return;
    }

    // Group staff by school_id
    const staffBySchool = {};
    for (const member of staff) {
        if (!staffBySchool[member.school_id]) {
            staffBySchool[member.school_id] = [];
        }
        staffBySchool[member.school_id].push(member);
    }

    for (const [schoolId, members] of Object.entries(staffBySchool)) {
        console.log(`Processing school ${schoolId} with ${members.length} staff members.`);

        // Find or create 'Community' group for this school
        let { data: commChat, error: fetchErr } = await supabase
            .from('chat_groups')
            .select('id')
            .eq('school_id', schoolId)
            .eq('name', 'Community')
            .maybeSingle();

        let groupId;
        if (!commChat) {
            console.log("Creating new Community chat group...");
            const { data: newComm, error: createError } = await supabase
                .from('chat_groups')
                .insert([{ school_id: schoolId, name: 'Community' }])
                .select('id')
                .single();

            if (createError) {
                console.error("Error creating group:", createError);
                continue;
            }
            groupId = newComm.id;
        } else {
            console.log("Community chat group already exists.");
            groupId = commChat.id;
        }

        console.log("Group ID:", groupId);

        // Fetch existing participants to avoid violating unique constraints
        const { data: existingParticipants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('group_id', groupId);

        const existingIds = existingParticipants ? new Set(existingParticipants.map(ep => ep.user_id)) : new Set();

        const participantsToInsert = [];
        for (const member of members) {
            if (!existingIds.has(member.id)) {
                participantsToInsert.push({
                    group_id: groupId,
                    user_id: member.id,
                    role: (member.role === 'Principal' || member.role === 'Vice Principal') ? 'admin' : 'member'
                });
            }
        }

        if (participantsToInsert.length > 0) {
            console.log(`Inserting ${participantsToInsert.length} staff members into Community group...`);
            const { error: insertError } = await supabase
                .from('chat_participants')
                .insert(participantsToInsert);

            if (insertError) {
                console.error("Error inserting participants:", insertError);
            } else {
                console.log("Successfully added participants.");
            }
        } else {
            console.log("All staff members are already in the Community group.");
        }
    }

    console.log("Done.");
}

migrate();
