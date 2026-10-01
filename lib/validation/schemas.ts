import { z } from 'zod';
import { SUBJECT_VALUES } from '../constants/subjects';

const GRADE_ENUM = [
    'first_secondary',
    'second_secondary',
    'third_secondary',
    'third_preparatory',
    'second_secondary_baccalaureate',
] as const;

export const phoneSchema = z
    .string()
    .regex(/^01[0-9]{9}$/, 'رقم الهاتف يجب أن يبدأ بـ 01 ويتكون من 11 رقم');

export const passwordSchema = z
    .string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .max(100, 'كلمة المرور طويلة جداً');

export const registerSchema = z.object({
    name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100).trim(),
    phone: phoneSchema,
    password: passwordSchema,
    parentName: z.string().min(2, 'اسم ولي الأمر مطلوب').max(100).trim(),
    parentPhone: phoneSchema,
    grade: z.enum(GRADE_ENUM, {
        errorMap: () => ({ message: 'يرجى اختيار الصف الدراسي' }),
    }),
    governorate: z.string().min(2, 'يرجى اختيار المحافظة').max(100).trim(),
    referralCode: z.string().optional(),
});

export const parentRegisterSchema = z.object({
    name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(100).trim(),
    phone: phoneSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    phone: phoneSchema,
    password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const otpVerifySchema = z.object({
    phone: phoneSchema,
    otp: z.string().length(6, 'الكود يجب أن يكون 6 أرقام').regex(/^\d{6}$/, 'الكود يجب أن يكون أرقام فقط'),
});

export const lessonSchema = z.object({
    title: z.string().min(3, 'عنوان الحصة مطلوب').max(200),
    lessonNumber: z.number().min(1),
    unit: z.string().min(1, 'الوحدة مطلوبة').max(100),
    subject: z.enum(SUBJECT_VALUES as [string, ...string[]], { errorMap: () => ({ message: 'يرجى اختيار المادة' }) }),
    description: z.string().max(2000).optional(),
    thumbnail: z.string().url('رابط الصورة غير صحيح').optional().or(z.literal('')),
    youtubeUrl: z.string().url('رابط YouTube غير صحيح').optional().or(z.literal('')),
    grade: z.enum(GRADE_ENUM),
    duration: z.number().min(0).optional(),
    order: z.number().optional(),
    points: z.number().min(0).default(10),
    isPublished: z.boolean().default(false),
    isFree: z.boolean().default(false),
    showOnHomepage: z.boolean().default(false),
    homeworkDescription: z.string().max(1000).optional(),
});

export const questionSchema = z.object({
    text: z.string().min(5, 'نص السؤال مطلوب').max(1000),
    type: z.enum(['mcq', 'true_false']),
    choices: z
        .array(
            z.object({
                text: z.string().min(1),
                isCorrect: z.boolean(),
            })
        )
        .min(2, 'يجب إضافة خيارين على الأقل')
        .max(6),
    explanation: z.string().max(1000).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    subject: z.enum(SUBJECT_VALUES as [string, ...string[]], { errorMap: () => ({ message: 'يرجى اختيار المادة' }) }),
    grade: z.string().optional(),
    unit: z.string().max(100).optional(),
    points: z.number().min(1).default(1),
    tags: z.array(z.string()).optional(),
});

export const examSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    type: z.enum(['quiz', 'weekly', 'monthly']),
    grade: z.enum(GRADE_ENUM),
    subject: z.enum(SUBJECT_VALUES as [string, ...string[]]).optional(),
    duration: z.number().min(5, 'مدة الامتحان يجب أن تكون 5 دقائق على الأقل'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    maxAttempts: z.number().min(1).default(1),
    passingScore: z.number().min(0).max(100).default(50),
    isPublished: z.boolean().default(false),
    isFree: z.boolean().default(false),
    lessonId: z.string().optional(),
});

export const branchSchema = z.object({
    name: z.string().min(2).max(100),
    address: z.string().min(5).max(500),
    description: z.string().max(1000).optional(),
    phone: z.string().optional(),
    googleMapsUrl: z.string().url().optional().or(z.literal('')),
    workingHours: z.string().max(200).optional(),
});

export const settingsUpdateSchema = z.object({
    key: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean()]),
});

export const subscriptionPlanSchema = z.object({
    name: z.string().min(3).max(100),
    grade: z.enum(GRADE_ENUM),
    description: z.string().max(2000).optional(),
    type: z.enum(['monthly', 'term', 'yearly']),
    durationInDays: z.number().min(1),
    price: z.number().min(0),
    originalPrice: z.number().min(0).optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    offerEnabled: z.boolean().default(false),
    offerType: z.enum(['FREE_FIRST_N', 'DISCOUNT_FIRST_N', 'NONE']).default('NONE'),
    offerLimit: z.number().min(0).default(0),
    features: z.array(z.string()).optional(),
    active: z.boolean().default(true),
});

export const paymentMethodSchema = z.object({
    name: z.string().min(2).max(100),
    number: z.string().min(5).max(50),
    instructions: z.string().max(2000).optional(),
    accountName: z.string().max(100).optional(),
    active: z.boolean().default(true),
});

export const paymentRequestSubmitSchema = z.object({
    planId: z.string().min(1),
    paymentMethod: z.string().min(1),
    transactionRef: z.string().optional(),
    paymentProof: z.string().min(1, 'يرجى إرفاق صورة إثبات التحويل'),
});
