const ENGLISH_NAMES = [
  "Alex", "Emma", "Daniel", "Sofia", "Lucas", "Mia",
  "Noah", "Liam", "Olivia", "Grace", "Leo", "Ella"
];

const CHINESE_SURNAMES = [
  "Li", "Wang", "Zhang", "Liu", "Chen", "Yang",
  "Zhao", "Huang", "Wu", "Zhou", "Xu", "Sun"
];

const CHINESE_GIVEN_NAMES = [
  "Wei", "Ming", "Jie", "Yun", "Xinyi", "Yuchen",
  "Haoran", "Meilin", "Zihan", "Ting", "Jiahao", "Ling"
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateStudentIdentity() {
  const numericId = Math.floor(Math.random() * 9000 + 1000);
  const useChinesePinyin = Math.random() < 0.65;

  if (useChinesePinyin) {
    const surname = pick(CHINESE_SURNAMES);
    const given = pick(CHINESE_GIVEN_NAMES);

    return {
      studentId: `cn_${numericId}`,
      displayName: `${surname} ${given}`,
      originType: "domestic_pinyin"
    };
  }

  const englishName = pick(ENGLISH_NAMES);

  return {
    studentId: `int_${numericId}`,
    displayName: englishName,
    originType: "international"
  };
}
