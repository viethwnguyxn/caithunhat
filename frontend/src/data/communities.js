import brandMark from '../assets/lapulga-mark.svg'

export const CATEGORY_AVATAR_MAP = {
  'Công nghệ': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=300&fit=crop&q=80',
  'Công nghệ & Lập trình': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=300&fit=crop&q=80',
  'Sách & Tư duy': 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=300&fit=crop&q=80',
  'Nghệ thuật & Sáng tạo': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop&q=80',
  'Thể thao & Sức khỏe': 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&h=300&fit=crop&q=80',
  'Freelance & Khởi nghiệp': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&h=300&fit=crop&q=80',
  'Game & Esports': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=300&fit=crop&q=80',
  'Âm nhạc & Chill': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
  'Phát triển bản thân': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop&q=80',
}

export const DEFAULT_COMMUNITY_AVATAR =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=300&fit=crop&q=80'

export function getCommunityAvatarUrl(communityOrCategory) {
  if (!communityOrCategory) return DEFAULT_COMMUNITY_AVATAR
  if (typeof communityOrCategory === 'string') {
    return CATEGORY_AVATAR_MAP[communityOrCategory] || DEFAULT_COMMUNITY_AVATAR
  }
  if (communityOrCategory.avatar_url) {
    return communityOrCategory.avatar_url
  }
  const byCategory =
    CATEGORY_AVATAR_MAP[communityOrCategory.category] ||
    CATEGORY_AVATAR_MAP[communityOrCategory.feedCategory]
  if (byCategory) return byCategory

  const rawText = `${communityOrCategory.category || ''} ${communityOrCategory.name || ''}`.toLowerCase()
  if (/lập trình|công nghệ|tech|code|ai/.test(rawText)) return CATEGORY_AVATAR_MAP['Công nghệ & Lập trình']
  if (/sách|tư duy|đọc/.test(rawText)) return CATEGORY_AVATAR_MAP['Sách & Tư duy']
  if (/nghệ thuật|sáng tạo|vẽ|ảnh|thiết kế/.test(rawText)) return CATEGORY_AVATAR_MAP['Nghệ thuật & Sáng tạo']
  if (/thể thao|sức khỏe|running|chạy|bóng|gym|yoga/.test(rawText)) return CATEGORY_AVATAR_MAP['Thể thao & Sức khỏe']
  if (/freelance|khởi nghiệp|cafe|cà phê/.test(rawText)) return CATEGORY_AVATAR_MAP['Freelance & Khởi nghiệp']
  if (/game|esports|gaming/.test(rawText)) return CATEGORY_AVATAR_MAP['Game & Esports']
  if (/âm nhạc|nhạc|lofi|chill/.test(rawText)) return CATEGORY_AVATAR_MAP['Âm nhạc & Chill']
  return DEFAULT_COMMUNITY_AVATAR || brandMark
}

export const COMMUNITY_DIRECTORY = [
  {
    id: 1,
    name: 'Lập trình viên & Tech Creators',
    category: 'Công nghệ',
    feedCategory: 'Công nghệ & Lập trình',
    icon: '💻',
    avatar_url: CATEGORY_AVATAR_MAP['Công nghệ'],
    membersCount: 1240,
    description:
      'Dành cho những bạn đam mê coding, xây dựng sản phẩm AI, công nghệ, chia sẻ kinh nghiệm học thuật và dự án nguồn mở.',
    tags: ['Python', 'React', 'AI / ML', 'WebRTC', 'CyberUI'],
    activeTopic: 'Chia sẻ các dự án cá nhân tâm đắc nhất bạn từng làm',
  },
  {
    id: 2,
    name: 'Sách & Phát triển bản thân',
    category: 'Sách & Tư duy',
    feedCategory: 'Sách & Tư duy',
    icon: '📚',
    avatar_url: CATEGORY_AVATAR_MAP['Sách & Tư duy'],
    membersCount: 980,
    description:
      'Nơi cùng nhau chia sẻ những cuốn sách hay, đúc kết tư duy tích cực, xây dựng kỷ luật và thói quen tốt mỗi ngày.',
    tags: ['Đọc sách', 'Tư duy', 'Thói quen', 'Tâm lý học', 'DeepWork'],
    activeTopic: 'Cuốn sách nào đã thay đổi góc nhìn cuộc sống của bạn?',
  },
  {
    id: 3,
    name: 'Nghệ thuật & Sáng tạo',
    category: 'Nghệ thuật & Sáng tạo',
    feedCategory: 'Nghệ thuật & Sáng tạo',
    icon: '🎨',
    avatar_url: CATEGORY_AVATAR_MAP['Nghệ thuật & Sáng tạo'],
    membersCount: 750,
    description:
      'Không gian ấm cúng dành cho những tâm hồn yêu vẽ, nhiếp ảnh, âm nhạc, thiết kế đồ họa và sáng tác nội dung.',
    tags: ['Hội họa', 'Nhiếp ảnh', 'Thiết kế', 'Âm nhạc', '3D / Shader'],
    activeTopic: 'Tác phẩm sáng tạo gần đây khiến bạn tự hào nhất',
  },
  {
    id: 4,
    name: 'Sức khỏe, Thể thao & Running',
    category: 'Thể thao & Sức khỏe',
    feedCategory: 'Thể thao & Sức khỏe',
    icon: '🏃',
    avatar_url: CATEGORY_AVATAR_MAP['Thể thao & Sức khỏe'],
    membersCount: 860,
    description:
      'Cùng nhau rèn luyện thể lực, chia sẻ lộ trình chạy bộ, tập gym, yoga và xây dựng lối sống lành mạnh, giàu năng lượng.',
    tags: ['Chạy bộ', 'Gym & Fitness', 'Yoga', 'Dinh dưỡng', 'Marathon'],
    activeTopic: 'Mục tiêu chạy bộ / thể thao của bạn trong tháng này',
  },
  {
    id: 5,
    name: 'Freelance & Khởi nghiệp',
    category: 'Freelance & Khởi nghiệp',
    feedCategory: 'Freelance & Khởi nghiệp',
    icon: '☕',
    avatar_url: CATEGORY_AVATAR_MAP['Freelance & Khởi nghiệp'],
    membersCount: 690,
    description:
      'Mạng lưới gắn kết cho những người làm việc tự do hoặc khởi nghiệp, tìm bạn đồng hành tại quán cafe và chia sẻ dự án.',
    tags: ['Freelance', 'Remote Work', 'Co-working', 'Khởi nghiệp', 'Cà phê'],
    activeTopic: 'Địa điểm làm việc cafe yêu thích nhất của bạn',
  },
  {
    id: 6,
    name: 'Game & Esports Gaming',
    category: 'Game & Esports',
    feedCategory: 'Game & Esports',
    icon: '🎮',
    avatar_url: CATEGORY_AVATAR_MAP['Game & Esports'],
    membersCount: 1120,
    description:
      'Không gian thảo luận chiến thuật, tìm đồng đội leo rank và chia sẻ đam mê game đa nền tảng.',
    tags: ['Esports', 'Steam', 'Indie Games', 'Co-op', 'Discord'],
    activeTopic: 'Tựa game nào khiến bạn đắm chìm nhiều giờ nhất?',
  },
]

export const COMMUNITY_CATEGORIES = [
  'Tất cả',
  'Công nghệ & Lập trình',
  'Sách & Tư duy',
  'Nghệ thuật & Sáng tạo',
  'Thể thao & Sức khỏe',
  'Freelance & Khởi nghiệp',
  'Game & Esports',
]
