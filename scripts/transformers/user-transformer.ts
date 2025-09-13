import { ExtendedUserData, Organization } from '../types';

export class UserTransformer {
  static transformUser = (
    organization: Organization,
  ): ExtendedUserData | null => {
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
    const baseUsername =
      contactName || principalName || organizationName || `user_${Date.now()}`;

    // 生成唯一的用户名：基础用户名 + 组织名称（确保唯一性）
    const orgCleanName = organizationName
      ? organizationName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')
      : 'org';

    // 清理用户名，移除特殊字符
    const cleanBaseUsername = baseUsername.replace(
      /[^a-zA-Z0-9\u4e00-\u9fa5]/g,
      '',
    );

    // 生成带序号的用户名格式
    const generateUsername = (suffix: string = ''): string => {
      return `${cleanBaseUsername}_${orgCleanName}${suffix}`;
    };

    // 生成唯一用户名（序号从1开始）
    // 注意：这里只是生成用户名格式，实际唯一性检查在导入脚本中进行
    let username = generateUsername();

    return {
      username,
      email,
      password: Math.random().toString(36).slice(-12), // 生成随机密码
      confirmed: false, // 不需要确认
      blocked: true, // 阻止登录
      provider: 'local',
      phone: contactPhone || undefined,
      // 设置默认角色（通常 authenticated 用户角色的 ID 是 1）
      role: 1,
    } as ExtendedUserData;
  };

  static extractPrincipalName = (organization: Organization): string => {
    return organization['负责人'] || '';
  };

  static extractContactInfo = (
    organization: Organization,
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
