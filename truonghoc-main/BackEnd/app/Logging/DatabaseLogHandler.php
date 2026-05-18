<?php

namespace App\Logging;

use Monolog\Handler\AbstractProcessingHandler;
use Monolog\LogRecord;
use Illuminate\Support\Facades\DB;

class DatabaseLogHandler extends AbstractProcessingHandler
{
    protected function write(LogRecord $record): void
    {
        DB::table('logs')->insert([
            'message'    => $record->message,
            'level'      => $record->level->name,
            'context'    => json_encode($record->context),
            'created_at' => now(),
        ]);
    }
}