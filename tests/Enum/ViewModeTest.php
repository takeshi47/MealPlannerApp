<?php

declare(strict_types=1);

namespace App\Tests\Enum;

use App\Enum\ViewMode;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class ViewModeTest extends TestCase
{
    #[DataProvider('monthModeProvider')]
    public function testGetTargetDateListInMonthMode(string $baseDateStr, string $expectedStart, string $expectedEnd, int $expectedCount): void
    {
        $baseDate = new \DateTimeImmutable($baseDateStr);
        $viewMode = ViewMode::MONTH;

        $dateList = $viewMode->getTargetDateList($baseDate);

        $this->assertCount($expectedCount, $dateList);
        $this->assertSame($expectedStart, $dateList[0]);
        $this->assertSame($expectedEnd, end($dateList));
    }

    public static function monthModeProvider(): array
    {
        return [
            '2026年3月 (1日が日曜日)' => [
                'baseDateStr' => '2026-03-15',
                'expectedStart' => '2026-02-23', // 3/1を含む週の月曜日
                'expectedEnd' => '2026-04-05',   // 3/31を含む週の日曜日
                'expectedCount' => 42,           // 6週間分
            ],
            '2026年2月 (平年)' => [
                'baseDateStr' => '2026-02-10',
                'expectedStart' => '2026-01-26',
                'expectedEnd' => '2026-03-01',
                'expectedCount' => 35,           // 5週間分
            ],
            '2024年2月 (閏年)' => [
                'baseDateStr' => '2024-02-15',
                'expectedStart' => '2024-01-29',
                'expectedEnd' => '2024-03-03',
                'expectedCount' => 35,
            ],
        ];
    }

    public function testGetTargetDateListInWeekMode(): void
    {
        $baseDate = new \DateTimeImmutable('2026-03-11'); // 水曜日
        $viewMode = ViewMode::WEEK;

        $dateList = $viewMode->getTargetDateList($baseDate);

        $this->assertCount(7, $dateList);
        $this->assertSame('2026-03-09', $dateList[0]); // 月曜日
        $this->assertSame('2026-03-15', $dateList[6]); // 日曜日
    }
}
