export const PYTHON_TEMPLATE = `# Two Sum
from typing import List

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []


# Test
sol = Solution()
print(sol.twoSum([2, 7, 11, 15], 9))   # [0, 1]
print(sol.twoSum([3, 2, 4], 6))         # [1, 2]
print(sol.twoSum([3, 3], 6))            # [0, 1]
`;

export const TYPESCRIPT_TEMPLATE = `// Two Sum
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }
  return [];
}

// Test
console.log(twoSum([2, 7, 11, 15], 9));   // [0, 1]
console.log(twoSum([3, 2, 4], 6));         // [1, 2]
console.log(twoSum([3, 3], 6));            // [0, 1]
`;

export const PYTHON_BLANK = `# Problem Title
from typing import List, Optional

class Solution:
    def solve(self) -> None:
        pass


# Tests
sol = Solution()
print(sol.solve())
`;

export const TYPESCRIPT_BLANK = `// Problem Title

function solve(): void {
  // your solution here
}

// Tests
console.log(solve());
`;
