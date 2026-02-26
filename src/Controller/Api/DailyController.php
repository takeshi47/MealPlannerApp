<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Criteria\DailyFetchCriteria;
use App\Entity\Daily;
use App\Entity\Meal;
use App\Enum\MealType;
use App\Form\DailyFetchType;
use App\Form\DailyType;
use App\UseCase\DailyFetchUseCase;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/daily', name: 'daily_')]
final class DailyController extends AbstractController
{
    use ApiControllerTrait;

    #[Route(name: 'fetch', methods: ['POST'])]
    public function fetch(Request $request, DailyFetchUseCase $dailyFetchUseCase): Response
    {
        $dailyFetchCriteria = new DailyFetchCriteria();
        $form = $this->createForm(DailyFetchType::class, $dailyFetchCriteria);

        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if (!$form->isSubmitted() || !$form->isValid()) {
            return $this->json($this->getErrorsFromForm($form), Response::HTTP_BAD_REQUEST);
        }

        $result = $dailyFetchUseCase->fetchDailyMeals($dailyFetchCriteria);

        return $this->json($result);
    }

    #[Route('/create', name: 'create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $entityManager): Response
    {
        $daily = new Daily();
        $form = $this->createForm(DailyType::class, $daily);

        $data = json_decode($request->getContent(), true);
        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($daily);
            $entityManager->flush();

            return new Response();
        }

        return $this->json($this->getErrorsFromForm($form), Response::HTTP_BAD_REQUEST);
    }

    #[Route('/update/{id}', name: 'update', methods: ['POST'])]
    public function update(Request $request, Daily $daily, EntityManagerInterface $entityManager): Response
    {
        $form = $this->createForm(DailyType::class, $daily);
        $data = json_decode($request->getContent(), true);

        $form->submit($data);

        if ($form->isSubmitted() && $form->isValid()) {
            $entityManager->persist($daily);
            $entityManager->flush();

            return new Response();
        }

        return $this->json($this->getErrorsFromForm($form), Response::HTTP_BAD_REQUEST);
    }

    #[Route('/init-data', name: 'init_data', methods: ['GET'])]
    public function getInitData(): Response
    {
        return $this->json([
            'mealTypes' => MealType::getChoices(),
            'config' => [
                'mealsMax' => Daily::MEALS_MAX,
                'mealsMin' => Daily::MEALS_MIN,
                'menusMin' => Meal::MENUS_MIN,
            ],
        ]);
    }
}
