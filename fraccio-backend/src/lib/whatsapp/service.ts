import { Client, type GroupChat, type CreateGroupResult } from "whatsapp-web.js";
import whatsapp from "whatsapp-web.js";
import { type SupabaseClient } from "@supabase/supabase-js";
const { MessageMedia } = whatsapp;

export interface MessageMediaInput {
    url: string;
    filename?: string;
}

export class WhatsAppService {
    constructor(private client: Client, private supabaseClient: SupabaseClient) { }

    private toWhatsappId(phone: string): string {
        const cleanedPhone = phone.replace(/\D/g, '');
        return `${cleanedPhone}@c.us`;
    }

    async sendGroupMessage(groupId: string, message: string, media?: MessageMediaInput) {
        const chat = await this.client.getChatById(groupId)

        if (!chat.isGroup) {
            throw new Error("The provided ID does not correspond to a group chat.");
        }

        if (media) {
            // unsafeMime: presigned URLs carry query strings that break extension-based mime sniffing
            const attachment = await MessageMedia.fromUrl(media.url, {
                unsafeMime: true,
                ...(media.filename ? { filename: media.filename } : {}),
            });
            await chat.sendMessage(attachment, { caption: message });
        } else {
            await chat.sendMessage(message);
        }

        //TODO: save to DB

        return {
            status: "sent",
            groupId,
        };
    }

    async addUsertoGroup(groupId: string, phone: string) {
        const chat = await this.client.getChatById(groupId);

        if (!chat.isGroup) {
            throw new Error("The provided ID does not correspond to a group chat.");
        }

        const group = chat as GroupChat;
        const whatsappId = this.toWhatsappId(phone);

        try {
            const result = await group.addParticipants([whatsappId], {
                sleep: [1000, 3000]
            });

            //TODO: save to DB to tenantId

            return {
                phone,
                whatsappId,
                status: "added",
                result
            }
        } catch (error) {
            const inviteCode = await group.getInviteCode();

            return {
                phone,
                whatsappId,
                status: "invite_required",
                inviteLink: `https://chat.whatsapp.com/${inviteCode}`,
                error: (error as Error).message
            }
        }
    }

    async createTenantGroup(groupName: string, initialMembers: string[]) {
        let whatsappIds: string[] | undefined;
        if (initialMembers.length > 0) {
            whatsappIds = initialMembers.map(phone => this.toWhatsappId(phone));
        }
        
        const group = await this.client.createGroup(groupName, whatsappIds);

        const waGroup = group as CreateGroupResult;
        return {
            groupName,
            groupId: waGroup.gid._serialized,
            status: "created"
        }
    }
}