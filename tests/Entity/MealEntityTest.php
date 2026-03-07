<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\Meal;
use App\Entity\Menu;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class MealEntityTest extends KernelTestCase
{
    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->validator = self::getContainer()->get('validator');
    }

    public function testInvalidMealType(): void
    {
        $meal = new Meal();
        $meal->setMealType('invalid_type'); // 選択肢外
        $meal->addMenu(new Menu());

        $violations = $this->validator->validate($meal);
        $this->assertGreaterThan(0, count($violations));
        $this->assertSame('mealType', $violations[0]->getPropertyPath());
    }

    public function testMealWithZeroMenusIsInvalid(): void
    {
        $meal = new Meal();
        $meal->setMealType(Meal::BREAKFAST);
        // menuは初期状態で空

        $violations = $this->validator->validate($meal);
        $this->assertGreaterThan(0, count($violations));
        $this->assertSame('menu', $violations[0]->getPropertyPath());
    }
}
