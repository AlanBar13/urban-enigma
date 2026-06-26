import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

class S3Service {
    private bucketName: string
    private region: string
    private client: S3Client

    constructor() {
        if (!process.env.S3_REGION || !process.env.S3_BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
            throw new Error('S3 configuration is incomplete')
        }

        const client = new S3Client({
            region: process.env.S3_REGION,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            },
            forcePathStyle: true
        });

        this.client = client;
        this.region = process.env.S3_REGION;
        this.bucketName = process.env.S3_BUCKET_NAME;
    }

    async uploadFile(file: Buffer, path: string, isPublic: boolean, originalName: string, contentType?: string) {
        try {
            const key = `${path}/${crypto.randomUUID()}`
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file,
                ACL: isPublic ? "public-read" : "private",
                ContentType: contentType,
                Metadata: {
                    originalName: originalName
                }
            });

            await this.client.send(command)

            return {
                url: isPublic ? this.getFileUrl(key) : await this.getPreSignedUrl(key),
                key,
                isPublic
            }
        }
        catch (error) {
            console.error('Error uploading file to S3:', error)
            throw new Error('File uploading failed')
        }
    }

    getFileUrl(key: string) {
        return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    }

    async getPreSignedUrl(key: string) {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key
            })

            const url = await getSignedUrl(this.client, command, {
                expiresIn: 60 * 60 * 3
            })

            return url
        } catch (error) {
            throw new Error(`Error getting preSigned Url`);
        }
    }

    async deleteFile(key: string) {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            })
            await this.client.send(command);
            return true;
        } catch (error) {
            throw new Error(`Error deleting file: ${error}`);
        }
    }
}

export const s3Service = new S3Service()