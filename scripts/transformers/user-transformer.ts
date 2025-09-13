import { ExtendedUserData } from '../types';

export class UserTransformer {
  static transformUser = (organization: any): ExtendedUserData | null => {
    // 获取用户信息
    const contactName = organization['机构联系人联系人姓名'] || '';
    const contactPhone = organization['机构联系人联系人电话'] || '';
    const contactEmail = organization['机构联系人联系人邮箱'] || '';
    const principalName = organization['负责人'] || '';

    // 检查是否有联系方式（邮箱或手机）
    const hasValidEmail = contactEmail && contactEmail.includes('@');
    const hasValidPhone = contactPhone && contactPhone.trim().length > 0;

    // 如果没有任何联系方式，则不创建用户
    if (!hasValidEmail && !hasValidPhone) {
      return null;
    }

    // 生成邮箱：优先使用真实邮箱，如果没有则用手机号生成系统邮箱
    let email;
    if (hasValidEmail) {
      email = contactEmail;
    } else {
      // 生成统一的假邮箱地址（明显是假的，因为只用来存储联系信息）
      const cleanPhone = contactPhone.replace(/\D/g, ''); // 只保留数字
      email = `${cleanPhone}@system.local`;
    }

    // 生成用户名：优先使用联系人姓名，没有则使用负责人，最后使用组织名
    const organizationName = organization['常用名称'] || organization.name;
    const username =
      contactName || principalName || organizationName || `user_${Date.now()}`;

    return {
      username,
      email,
      confirmed: false, // 不需要确认
      blocked: true, // 阻止登录
      provider: 'local',
      phone: contactPhone || undefined,
    } as ExtendedUserData;
  };

  static extractPrincipalName = (organization: any): string => {
    return organization['负责人'] || '';
  };

  static extractContactInfo = (
    organization: any,
  ): {
    name: string;
    phone: string;
    email: string;
  } => {
    return {
      name: organization['机构联系人联系人姓名'] || '',
      phone: organization['机构联系人联系人电话'] || '',
      email: organization['机构联系人联系人邮箱'] || '',
    };
  };
}
