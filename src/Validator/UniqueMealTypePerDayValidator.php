<?php

declare(strict_types=1);

namespace App\Validator;

use App\Entity\Daily;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;

class UniqueMealTypePerDayValidator extends ConstraintValidator
{
    public function validate($daily, Constraint $constraint): void
    {
        if (!$daily instanceof Daily) {
            return;
        }

        if (!$constraint instanceof UniqueMealTypePerDay) {
            return;
        }

        $result = [];

        foreach ($daily->getMeals() as $meal) {
            $type = $meal->getMealType();

            if (isset($result[$type])) {
                $this->context
                    ->buildViolation($constraint->message)
                    ->setParameter('{{ type }}', $type)
                    ->atPath('daily')
                    ->addViolation();

                return;
            }

            $result[$type] = true;
        }

        return;
    }
}
