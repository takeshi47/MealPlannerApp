<?php

declare(strict_types=1);

namespace App\Enum;

enum MealType: string
{
    case BREAKFAST = 'breakfast';
    case LUNCH = 'lunch';
    case DINNER = 'dinner';

    public function getLabel(): string
    {
        return match ($this) {
            self::BREAKFAST => '朝食',
            self::LUNCH => '昼食',
            self::DINNER => '夕食',
        };
    }

    public static function getChoices(): array
    {
        $choices = [];

        foreach (self::cases() as $case) {
            $choices[] = [
                'value' => $case->value,
                'label' => $case->getLabel(),
            ];
        }

        return $choices;
    }
}
